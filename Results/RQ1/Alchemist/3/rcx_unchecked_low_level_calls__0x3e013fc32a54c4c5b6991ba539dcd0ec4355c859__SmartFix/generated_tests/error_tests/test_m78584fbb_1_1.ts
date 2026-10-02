import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed when calling multiplicate with msg.value = 0, but the mutant reverts due to msg.value-1 underflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call multiplicate with msg.value = 0 (sending no ether)
    // In the original, this should succeed (balance + 0 >= balance is true)
    // In the mutant, balance + 0 - 1 >= balance is false, so it reverts
    const tx = await instance.connect(addr1).multiplicate(addr1.address, { value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});