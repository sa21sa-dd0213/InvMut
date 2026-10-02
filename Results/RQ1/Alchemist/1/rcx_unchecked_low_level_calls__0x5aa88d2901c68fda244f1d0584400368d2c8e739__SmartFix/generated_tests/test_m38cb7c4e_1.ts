import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m38cb7c4e (multiplicate: * instead of +)", function () {
  it("should allow multiplicate with msg.value = 0 when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some Ether first (via receive)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call multiplicate with msg.value = 0
    // In the original, this should succeed (transfer 0 works, check passes)
    // In the mutant, this will revert because 0 * balance = 0 < balance
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});