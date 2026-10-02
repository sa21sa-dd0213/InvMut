import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let uniswapRouter: any;
  let usdToken: any;
  
  const NAME = "ANCH";
  const SYMBOL = "ANCH";
  const DECIMALS = 18;
  const TOTAL_SUPPLY = ethers.parseEther("10000000");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock Uniswap V2 Router
    const MockUniswapV2Router02 = await ethers.getContractFactory("MockUniswapV2Router02");
    uniswapRouter = await MockUniswapV2Router02.deploy();
    await uniswapRouter.waitForDeployment();

    // Deploy mock USD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdToken = await MockERC20.deploy("USD Token", "USD", DECIMALS);
    await usdToken.waitForDeployment();

    // Deploy ANCHToken
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    token = await ANCHToken.deploy(
      await uniswapRouter.getAddress(),
      await usdToken.getAddress()
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("Should have correct name, symbol and decimals", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("Should create Uniswap pair", async function () {
      const pairAddress = await token.uniswapV2Pair();
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      await token.transfer(addr1.address, transferAmount);
      
      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("Unauthorized role");
      
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await token.transfer(addr1.address, transferAmount);
      await token.transfer(addr2.address, transferAmount);
      
      expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - transferAmount * 2n);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      const approveAmount = ethers.parseEther("1000");
      await token.approve(addr1.address, approveAmount);
      
      expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount);
    });

    it("Should perform delegated transfer", async function () {
      const transferAmount = ethers.parseEther("100");
      const approveAmount = ethers.parseEther("1000");
      
      await token.approve(addr1.address, approveAmount);
      await token.transfer(addr1.address, transferAmount);
      
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
      
      expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(approveAmount - transferAmount);
    });

    it("Should fail with insufficient allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await token.approve(addr1.address, transferAmount - 1n);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });
  });

  describe("Reward Mechanism", function () {
    it("Should distribute rewards on buy transactions meeting minimum", async function () {
      const minTxnAmount = await token.minTxnAmount();
      const buyAmount = minTxnAmount + ethers.parseEther("1");
      
      // Transfer tokens to the contract for rewards
      await token.transfer(await token.getAddress(), buyAmount);
      
      // Perform a buy transaction (simulated by having recipient as allowed role)
      await token.transfer(addr1.address, buyAmount);
      
      const rewardRate = await token.rewardRate();
      const percent = await token.percent();
      const expectedReward = buyAmount * rewardRate / percent;
      
      expect(await token.txReward(addr1.address)).to.equal(expectedReward);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to change owner", async function () {
      await token.changeOwner(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
    });

    it("Should not allow non-owner to change owner", async function () {
      await expect(
        token.connect(addr1).changeOwner(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update minTxnAmount", async function () {
      const newMinTxn = ethers.parseEther("50000");
      await token.setMinTxnAmount(newMinTxn);
      expect(await token.minTxnAmount()).to.equal(newMinTxn);
    });

    it("Should allow owner to update rewardRate", async function () {
      const newRate = 10;
      await token.setRewardRate(newRate);
      expect(await token.rewardRate()).to.equal(newRate);
    });

    it("Should allow owner to change Uniswap pair", async function () {
      const newPair = ethers.Wallet.createRandom().address;
      await token.changeUniswapV2Pair(newPair);
      expect(await token.uniswapV2Pair()).to.equal(newPair);
    });
  });
});