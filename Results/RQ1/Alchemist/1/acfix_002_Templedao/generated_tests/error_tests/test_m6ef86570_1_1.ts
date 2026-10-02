import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m6ef86570", function () {
  it("should revert when withdrawing 0 amount (mutant removes this check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 and approve
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // First stake some tokens to have a balance
    await instance.connect(addr1).stake(ethers.parseEther("10"));

    // Now attempt to withdraw 0 amount - this should revert in original but pass in mutant
    await expect(
      instance.connect(addr1).withdraw(0, false)
    ).to.be.revertedWith("Cannot withdraw 0");
  });
});