import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m79258a94 (remove Withdrawn event)", function () {
  it("should emit Withdrawn event on withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 and approve the staking contract
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake tokens first
    await instance.connect(addr1).stake(ethers.parseEther("100"));

    // Now withdraw and check for Withdrawn event
    const tx = await instance.connect(addr1).withdraw(ethers.parseEther("50"), false);
    const receipt = await tx.wait();

    // The mutant removes emit Withdrawn, so we expect the event to be present in the original
    await expect(tx).to.emit(instance, "Withdrawn").withArgs(
      addr1.address,
      addr1.address,
      ethers.parseEther("50")
    );
  });
});