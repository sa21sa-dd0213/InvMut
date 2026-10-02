import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GSPFunding, GSPVault, GSPStorage } from "../typechain-types";
import { BigNumber } from "ethers";

describe("GSPFunding", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let baseToken: any;
  let quoteToken: any;
  let gsp: GSPFunding;

  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  const BASE_AMOUNT = ethers.utils.parseEther("1000");
  const QUOTE_AMOUNT = ethers.utils.parseEther("2000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    baseToken = await MockERC20.deploy("Base Token", "BASE", INITIAL_SUPPLY);
    quoteToken = await MockERC20.deploy("Quote Token", "QUOTE", INITIAL_SUPPLY);

    // Deploy GSPFunding
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    gsp = await GSPFundingFactory.deploy();

    // Initialize the GSP contract
    await gsp.initialize(
      baseToken.address,
      quoteToken.address,
      ethers.utils.parseEther("1"), // _I_ = 1
      ethers.utils.parseEther("0.5"), // _K_ = 0.5
      ethers.utils.parseEther("0.003"), // _LP_FEE_RATE_ = 0.3%
      ethers.utils.parseEther("0"), // _MT_FEE_RATE_ = 0%
      owner.address, // _MAINTAINER_
      false // _IS_OPEN_TWAP_
    );

    // Transfer tokens to users
    await baseToken.transfer(user1.address, BASE_AMOUNT);
    await quoteToken.transfer(user1.address, QUOTE_AMOUNT);
    await baseToken.transfer(user2.address, BASE_AMOUNT);
    await quoteToken.transfer(user2.address, QUOTE_AMOUNT);

    // Approve GSP to spend tokens
    await baseToken.connect(user1).approve(gsp.address, ethers.constants.MaxUint256);
    await quoteToken.connect(user1).approve(gsp.address, ethers.constants.MaxUint256);
    await baseToken.connect(user2).approve(gsp.address, ethers.constants.MaxUint256);
    await quoteToken.connect(user2).approve(gsp.address, ethers.constants.MaxUint256);
  });

  describe("buyShares", function () {
    it("should allow buying shares with initial liquidity", async function () {
      // Transfer tokens to GSP
      await baseToken.connect(user1).transfer(gsp.address, BASE_AMOUNT);
      await quoteToken.connect(user1).transfer(gsp.address, QUOTE_AMOUNT);

      const tx = await gsp.connect(user1).buyShares(user1.address);
      const receipt = await tx.wait();

      // Check that shares were minted
      const shares = await gsp.balanceOf(user1.address);
      expect(shares).to.be.gt(0);
    });

    it("should fail with zero base input", async function () {
      // Only transfer quote tokens
      await quoteToken.connect(user1).transfer(gsp.address, QUOTE_AMOUNT);

      await expect(
        gsp.connect(user1).buyShares(user1.address)
      ).to.be.revertedWith("NO_BASE_INPUT");
    });

    it("should calculate shares correctly for initial deposit", async function () {
      await baseToken.connect(user1).transfer(gsp.address, BASE_AMOUNT);
      await quoteToken.connect(user1).transfer(gsp.address, QUOTE_AMOUNT);

      const tx = await gsp.connect(user1).buyShares(user1.address);
      const receipt = await tx.wait();

      const shares = await gsp.balanceOf(user1.address);
      // With I=1, shares should be min(baseAmount, quoteAmount) minus 1001
      const expectedShares = BASE_AMOUNT.sub(1001);
      expect(shares).to.equal(expectedShares);
    });
  });

  describe("sellShares", function () {
    beforeEach(async function () {
      // Setup: buy shares first
      await baseToken.connect(user1).transfer(gsp.address, BASE_AMOUNT);
      await quoteToken.connect(user1).transfer(gsp.address, QUOTE_AMOUNT);
      await gsp.connect(user1).buyShares(user1.address);
    });

    it("should allow selling shares", async function () {
      const shares = await gsp.balanceOf(user1.address);
      const baseBalanceBefore = await baseToken.balanceOf(user1.address);
      const quoteBalanceBefore = await quoteToken.balanceOf(user1.address);

      await gsp.connect(user1).sellShares(
        shares,
        user1.address,
        0,
        0,
        "0x",
        ethers.constants.MaxUint256
      );

      const baseBalanceAfter = await baseToken.balanceOf(user1.address);
      const quoteBalanceAfter = await quoteToken.balanceOf(user1.address);

      // User should have received some tokens back
      expect(baseBalanceAfter).to.be.gt(baseBalanceBefore);
      expect(quoteBalanceAfter).to.be.gt(quoteBalanceBefore);
    });

    it("should fail with insufficient shares", async function () {
      const shares = await gsp.balanceOf(user1.address);
      await expect(
        gsp.connect(user2).sellShares(
          shares,
          user2.address,
          0,
          0,
          "0x",
          ethers.constants.MaxUint256
        )
      ).to.be.revertedWith("GLP_NOT_ENOUGH");
    });

    it("should respect minimum amounts", async function () {
      const shares = await gsp.balanceOf(user1.address);
      const totalSupply = await gsp.totalSupply();
      const baseBalance = await baseToken.balanceOf(gsp.address);
      const quoteBalance = await quoteToken.balanceOf(gsp.address);
      
      const expectedBase = baseBalance.mul(shares).div(totalSupply);
      const expectedQuote = quoteBalance.mul(shares).div(totalSupply);

      await expect(
        gsp.connect(user1).sellShares(
          shares,
          user1.address,
          expectedBase.add(1),
          expectedQuote.add(1),
          "0x",
          ethers.constants.MaxUint256
        )
      ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");
    });
  });

  describe("permit", function () {
    it("should allow permit functionality", async function () {
      const deadline = ethers.constants.MaxUint256;
      const value = ethers.utils.parseEther("100");
      
      // Get the domain separator
      const domainSeparator = await gsp.DOMAIN_SEPARATOR();
      
      // Get nonce for user1
      const nonce = await gsp.nonces(user1.address);
      
      // Build the permit data
      const message = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
          [
            await gsp.PERMIT_TYPEHASH(),
            user1.address,
            user2.address,
            value,
            nonce,
            deadline,
          ]
        )
      );
      
      const digest = ethers.utils.keccak256(
        ethers.utils.concat([
          "0x1901",
          domainSeparator,
          message,
        ])
      );

      // Sign the permit
      const signature = await user1._signTypedData(
        {
          name: "GSP",
          version: "1",
          chainId: await ethers.provider.getNetwork().then(n => n.chainId),
          verifyingContract: gsp.address,
        },
        {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        {
          owner: user1.address,
          spender: user2.address,
          value: value,
          nonce: nonce,
          deadline: deadline,
        }
      );

      const { v, r, s } = ethers.utils.splitSignature(signature);

      await gsp.permit(
        user1.address,
        user2.address,
        value,
        deadline,
        v,
        r,
        s
      );

      const allowance = await gsp.allowance(user1.address, user2.address);
      expect(allowance).to.equal(value);
    });
  });
});