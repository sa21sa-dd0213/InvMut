import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m1de27864", function () {
  it("should kill mutant that changed >= to <= in multiplicate function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with a positive msg.value (e.g., 1 ether)
    // In the original, the require is always true; in the mutant, it will revert
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });

    // The mutant's require condition `(balance + msg.value) <= balance` will fail
    // because balance + msg.value > balance when msg.value > 0
    await expect(tx).to.be.reverted;

    // Verify the contract balance didn't change (mutant killed - test passes)
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(initialContractBalance);
  });
});