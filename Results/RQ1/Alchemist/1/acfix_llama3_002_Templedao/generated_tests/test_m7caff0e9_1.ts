import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m7caff0e9 - stakeFor zero amount", function () {
  it("should revert when staking 0 tokens (kills mutant that changed > to >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Give addr1 some tokens to stake
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    
    // Approve the staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // Attempt to stake 0 tokens - this should revert in the original contract
    // but the mutant with ">=" will allow it, so this test will fail on the mutant
    await expect(
      staking.connect(addr1).stakeFor(addr1.address, 0)
    ).to.be.revertedWith("Cannot stake 0");
  });
});