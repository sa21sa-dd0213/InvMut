import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - deposit assertion (md63e87f8)", function () {
  it("should revert when depositing with the mutated assertion (balances[msg.sender] - msg.value > balances[msg.sender])", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutated assertion: assert(balances[msg.sender] - msg.value > balances[msg.sender])
    // For any positive deposit, this will always be false (since balance - amount < balance)
    // Therefore, the transaction should revert
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});