import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1c38a07e by calling sendTo with a positive amount and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so the transfer can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Call sendTo with a positive amount - should succeed on original, revert on mutant
    const amount = ethers.parseEther("0.1");
    await expect(instance.connect(owner).sendTo(addr1.address, amount)).to.not.be
      .reverted;
  });
});