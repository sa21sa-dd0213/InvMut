import { ethers } from "hardhat";
import { expect } from "chai";

describe("GSPFunding", function () {
  let baseToken: any;
  let quoteToken: any;
  let gspFunding: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let maintainer: any;

  beforeEach(async function () {
    [owner, user1, user2, maintainer] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    baseToken = await ERC20Mock.deploy("Base Token", "BASE", 18);
    quoteToken = await ERC20Mock.deploy("Quote Token", "QUOTE", 18);

    // Deploy GSPFunding
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    gspFunding = await GSPFunding.deploy();

    // Initialize the contract
    await gspFunding.initialize(
      maintainer.address,
      baseToken.address,
      quoteToken.address,
      ethers.utils.parseEther("1"), // _I_ (initial price)
      ethers.utils.parseEther("0.5"), // _K_ (initial K)
      ethers.utils.parseEther("0.001"), // _LP_FEE_RATE_
      ethers.utils.parseEther("0.0005"), // _MT_FEE_RATE_
      ethers.utils.parseEther("1000") // _PRICE_LIMIT_
    );

    // Mint tokens to users
    await baseToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await quoteToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await baseToken.mint(user2.address, ethers.utils.parseEther("1000"));
    await quoteToken.mint(user2.address, ethers.utils.parseEther("1000"));

    // Approve tokens for GSPFunding
    await baseToken.connect(user1).approve(gspFunding.address, ethers.utils.parseEther("1000"));
    await quoteToken.connect(user1).approve(gspFunding.address, ethers.utils.parseEther("1000"));
    await baseToken.connect(user2).approve(gspFunding.address, ethers.utils.parseEther("1000"));
    await quoteToken.connect(user2).approve(gspFunding.address, ethers.utils.parseEther("1000"));
  });

  describe("buyShares", function () {
    it("should allow first deposit and mint shares correctly", async function () {
      // Transfer tokens to GSPFunding to simulate initial liquidity
      await baseToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));
      await quoteToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));

      const tx = await gspFunding.connect(user1).buyShares(user1.address);
      const receipt = await tx.wait();

      // Check shares were minted
      const shares = await gspFunding.balanceOf(user1.address);
      expect(shares).to.be.gt(0);
      
      // Check total supply
      const totalSupply = await gspFunding.totalSupply();
      expect(totalSupply).to.be.gt(shares); // includes the 1001 minted to address(0)
    });

    it("should allow additional deposits after initial", async function () {
      // First deposit
      await baseToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));
      await quoteToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));
      await gspFunding.connect(user1).buyShares(user1.address);

      // Second deposit
      await baseToken.connect(user2).transfer(gspFunding.address, ethers.utils.parseEther("50"));
      await quoteToken.connect(user2).transfer(gspFunding.address, ethers.utils.parseEther("50"));
      await gspFunding.connect(user2).buyShares(user2.address);

      const user2Shares = await gspFunding.balanceOf(user2.address);
      expect(user2Shares).to.be.gt(0);
    });
  });

  describe("sellShares", function () {
    beforeEach(async function () {
      // Setup initial liquidity
      await baseToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));
      await quoteToken.connect(user1).transfer(gspFunding.address, ethers.utils.parseEther("100"));
      await gspFunding.connect(user1).buyShares(user1.address);
    });

    it("should allow selling shares and withdraw tokens", async function () {
      const sharesToSell = ethers.utils.parseEther("10");
      const user1Shares = await gspFunding.balanceOf(user1.address);
      
      // Ensure user has enough shares
      if (user1Shares.gt(sharesToSell)) {
        const tx = await gspFunding.connect(user1).sellShares(
          sharesToSell,
          user1.address,
          0,
          0,
          "0x",
          Math.floor(Date.now() / 1000) + 3600
        );
        
        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
      }
    });

    it("should revert if deadline has passed", async function () {
      const sharesToSell = ethers.utils.parseEther("1");
      
      await expect(
        gspFunding.connect(user1).sellShares(
          sharesToSell,
          user1.address,
          0,
          0,
          "0x",
          Math.floor(Date.now() / 1000) - 3600 // past deadline
        )
      ).to.be.revertedWith("TIME_EXPIRED");
    });
  });

  describe("Vault functions", function () {
    it("should get vault reserves", async function () {
      const [baseReserve, quoteReserve] = await gspFunding.getVaultReserve();
      expect(baseReserve).to.be.a("BigNumber");
      expect(quoteReserve).to.be.a("BigNumber");
    });

    it("should get PMM state", async function () {
      const state = await gspFunding.getPMMState();
      expect(state.i).to.be.a("BigNumber");
      expect(state.K).to.be.a("BigNumber");
    });
  });

  describe("Maintainer functions", function () {
    it("should allow maintainer to adjust price", async function () {
      await gspFunding.connect(maintainer).adjustPrice(ethers.utils.parseEther("1.1"));
      const newI = await gspFunding._I_();
      expect(newI).to.equal(ethers.utils.parseEther("1.1"));
    });

    it("should allow maintainer to adjust mt fee rate", async function () {
      await gspFunding.connect(maintainer).adjustMtFeeRate(ethers.utils.parseEther("0.002"));
      const newRate = await gspFunding._MT_FEE_RATE_();
      expect(newRate).to.equal(ethers.utils.parseEther("0.002"));
    });
  });
});