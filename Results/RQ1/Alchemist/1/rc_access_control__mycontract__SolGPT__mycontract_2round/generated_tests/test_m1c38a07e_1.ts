import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant m1c38a07e", function () {
  it("should allow transfer with positive amount from owner, but mutant will revert", async function () {
    const [owner, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with some ether for the transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // This should succeed on original (amount > 0), but fail on mutant (amount < 0)
    await expect(
      instance.sendTo(receiver.address, ethers.parseEther("0.1"))
    ).to.not.be.reverted;

    // Verify the transfer actually happened
    expect(await ethers.provider.getBalance(receiver.address)).to.equal(
      ethers.parseEther("0.1")
    );
  });
});