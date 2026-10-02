import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m6ef86570", function () {
  it("should revert when withdrawing 0 tokens, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Fund addr1 with staking tokens and approve
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // First, addr1 stakes some tokens to have a balance
    await instance.connect(addr1).stake(ethers.parseEther("10"));
    
    // Now attempt to withdraw 0 tokens - original reverts, mutant should not
    // We expect this to revert on the original, but the mutant would allow it
    await expect(
      instance.connect(addr1).withdraw(0, false)
    ).to.be.revertedWith("Cannot withdraw 0");
    
    // Verify that the balance hasn't changed (stake should still be 10)
    const balanceAfter = await instance.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(ethers.parseEther("10"));
  });
});