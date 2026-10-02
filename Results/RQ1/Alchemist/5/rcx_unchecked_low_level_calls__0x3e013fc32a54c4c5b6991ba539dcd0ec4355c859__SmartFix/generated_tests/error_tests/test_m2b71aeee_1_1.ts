import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m2b71aeee", function () {
  it("should detect the mutant that replaces + with * in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 wei
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: 10n
    });

    // Verify initial balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(10n);

    // Call multiplicate with 1 wei - original would send 11 wei, mutant would try to send 10 wei
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: 1n });
    
    // Mutant will try to send 10 * 1 = 10 wei^2 which exceeds balance and reverts
    // Original would succeed by sending 10 + 1 = 11 wei
    await expect(tx).to.be.reverted;
  });
});