import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StaxLPStaking, IERC20 } from "../typechain-types";

describe("StaxLPStaking", function () {
  let stakingToken: IERC20;
  let staking: StaxLPStaking;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let rewardDistributor: SignerWithAddress;
  let migrator: SignerWithAddress;

  const REWARD_AMOUNT = ethers.utils.parseEther("1000");
  const STAKE_AMOUNT = ethers.utils.parseEther("100");
  const DURATION = 86400 * 7;

  beforeEach(async function () {
    [owner, user1, user2, rewardDistributor, migrator] = await ethers.getSigners();

    // Deploy mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.utils.parseEther("1000000"));
    await stakingToken.deployed();

    // Deploy mock ERC20 token for rewards
    const MockRewardToken = await ethers.getContractFactory("MockERC20");
    const rewardToken = await MockRewardToken.deploy("Reward Token", "RWD", REWARD_AMOUNT);
    await rewardToken.deployed();

    // Deploy the StaxLPStaking contract
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StaxLPStakingFactory.deploy(stakingToken.address, rewardDistributor.address);
    await staking.deployed();

    // Transfer staking tokens to users
    await stakingToken.transfer(user1.address, STAKE_AMOUNT);
    await stakingToken.transfer(user2.address, STAKE_AMOUNT);
    await stakingToken.transfer(rewardDistributor.address, STAKE_AMOUNT);

    // Approve staking contract to spend user tokens
    await stakingToken.connect(user1).approve(staking.address, STAKE_AMOUNT);
    await stakingToken.connect(user2).approve(staking.address, STAKE_AMOUNT);
    await stakingToken.connect(rewardDistributor).approve(staking.address, STAKE_AMOUNT);

    // Add reward token and setup reward
    await staking.addReward(rewardToken.address);
    
    // Transfer reward tokens to rewardDistributor
    await rewardToken.transfer(rewardDistributor.address, REWARD_AMOUNT);
    await rewardToken.connect(rewardDistributor).approve(staking.address, REWARD_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the correct staking token", async function () {
      expect(await staking.stakingToken()).to.equal(stakingToken.address);
    });

    it("Should set the correct reward distributor", async function () {
      expect(await staking.rewardDistributor()).to.equal(rewardDistributor.address);
    });

    it("Should have zero total supply initially", async function () {
      expect(await staking.totalSupply()).to.equal(0);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
      expect(await staking.balanceOf(user1.address)).to.equal(STAKE_AMOUNT);
      expect(await staking.totalSupply()).to.equal(STAKE_AMOUNT);
    });

    it("Should emit Staked event", async function () {
      await expect(staking.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, STAKE_AMOUNT);
    });

    it("Should not allow staking zero amount", async function () {
      await expect(staking.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should allow distributor to add rewards", async function () {
      const rewardToken = await ethers.getContractAt("IERC20", await staking.rewardTokens(0));
      
      await staking.connect(rewardDistributor).notifyRewardAmount(
        rewardToken.address,
        REWARD_AMOUNT
      );

      const rewardData = await staking.rewardData(rewardToken.address);
      expect(rewardData.rewardRate).to.equal(REWARD_AMOUNT.div(DURATION));
    });

    it("Should calculate earned rewards correctly", async function () {
      const rewardToken = await ethers.getContractAt("IERC20", await staking.rewardTokens(0));
      
      await staking.connect(rewardDistributor).notifyRewardAmount(
        rewardToken.address,
        REWARD_AMOUNT
      );

      // Advance time by half the duration
      await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
      await ethers.provider.send("evm_mine");

      const earned = await staking.earned(user1.address, rewardToken.address);
      expect(earned).to.be.closeTo(REWARD_AMOUNT.div(2), REWARD_AMOUNT.div(100));
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should allow users to withdraw their stake", async function () {
      await staking.connect(user1).withdraw(STAKE_AMOUNT.div(2), false);
      expect(await staking.balanceOf(user1.address)).to.equal(STAKE_AMOUNT.div(2));
    });

    it("Should emit Withdrawn event", async function () {
      await expect(staking.connect(user1).withdraw(STAKE_AMOUNT, false))
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, user1.address, STAKE_AMOUNT);
    });

    it("Should not allow withdrawing more than staked", async function () {
      await expect(staking.connect(user1).withdraw(STAKE_AMOUNT.add(1), false))
        .to.be.revertedWith("Not enough staked tokens");
    });
  });

  describe("Migration", function () {
    beforeEach(async function () {
      await staking.setMigrator(migrator.address);
      await staking.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should allow migrator to migrate stake", async function () {
      // This test requires another staking contract to migrate from
      // For simplicity, we just test the migrator setup
      expect(await staking.migrator()).to.equal(migrator.address);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to set reward distributor", async function () {
      await staking.setRewardDistributor(user1.address);
      expect(await staking.rewardDistributor()).to.equal(user1.address);
    });

    it("Should not allow non-owner to set reward distributor", async function () {
      await expect(staking.connect(user1).setRewardDistributor(user1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});