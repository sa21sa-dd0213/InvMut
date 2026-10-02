import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendTo is called with zero address as receiver (kills mutant that removes receiver != address(0) check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH for the transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send to zero address - should revert in original, may pass in mutant
    await expect(
      instance.connect(owner).sendTo(ethers.ZeroAddress, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});