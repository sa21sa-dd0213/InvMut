import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - m4064caa9", function () {
  it("should allow partial withdrawal (less than full balance) and detect mutant requiring exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Transfer tokens to addr1 and approve the staking contract
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Stake 100 tokens for addr1
    await instance.connect(addr1).stake(ethers.parseEther("100"));
    
    // Attempt partial withdrawal of 40 tokens (less than full balance of 100)
    // Original contract should succeed, mutant should revert
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("40"), false)
    ).to.not.be.reverted;
  });
});