import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant md9b125e9 by calling multiplicate with insufficient value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10.0")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Try to call multiplicate with a value less than the contract balance
    // Original contract would revert because msg.value (1 ETH) < address(this).balance (10 ETH)
    // Mutant with condition "true" will incorrectly transfer the entire balance
    const smallValue = ethers.parseEther("1.0");
    const recipient = addr1.address;

    // In the original contract, this should revert because msg.value < contract balance
    // In the mutant, it will succeed and drain the contract
    await expect(
      instance.connect(owner).multiplicate(recipient, { value: smallValue })
    ).to.be.reverted;

    // Verify contract balance remains unchanged (only passes on original, fails on mutant)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});