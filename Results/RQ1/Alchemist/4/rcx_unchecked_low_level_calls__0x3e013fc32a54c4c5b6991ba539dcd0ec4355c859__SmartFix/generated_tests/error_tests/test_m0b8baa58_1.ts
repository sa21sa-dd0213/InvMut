import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0b8baa58 by calling multiplicate with msg.value = 0 and expecting success (no revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so that the balance check passes
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Call multiplicate with msg.value = 0 - should succeed in original but revert in mutant
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});