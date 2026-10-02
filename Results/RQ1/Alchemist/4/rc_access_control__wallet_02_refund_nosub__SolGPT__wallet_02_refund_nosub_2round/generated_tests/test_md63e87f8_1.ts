import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - md63e87f8", function () {
  it("should kill mutant by depositing 1 wei and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 wei - should succeed on original but fail on mutant
    // because mutant's assertion (balances[msg.sender] - msg.value > balances[msg.sender])
    // will always be false for any positive msg.value
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0.000000000000000001") })
    ).to.not.be.reverted;
  });
});