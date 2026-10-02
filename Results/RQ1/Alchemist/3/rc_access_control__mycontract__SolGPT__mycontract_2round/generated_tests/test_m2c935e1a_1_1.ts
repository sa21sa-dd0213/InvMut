import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call sendTo (mutant m2c935e1a kills owner access)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it can transfer ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner should be able to call sendTo - will revert in mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});