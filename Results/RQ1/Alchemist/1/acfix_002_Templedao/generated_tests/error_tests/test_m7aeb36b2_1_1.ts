import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m7aeb36b2 (Staked event emission)", function () {
  it("should emit Staked event when stake is called, killing the mutant that removes the event", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Mint tokens to addr1 and approve staking contract
    await stakingToken.mint(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("100"));

    // Call stake and expect Staked event
    const stakeAmount = ethers.parseEther("10");
    await expect(staking.connect(addr1).stake(stakeAmount))
      .to.emit(staking, "Staked")
      .withArgs(addr1.address, stakeAmount);
  });
});