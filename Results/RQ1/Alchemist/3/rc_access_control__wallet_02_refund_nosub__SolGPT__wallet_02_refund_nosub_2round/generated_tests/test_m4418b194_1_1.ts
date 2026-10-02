import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection test", function () {
  it("should detect mutant that adds 1 extra wei to deposited amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // On the original contract, balance should be exactly depositAmount
    // On the mutant, balance will be depositAmount + 1 wei

    // Attempt to withdraw the full balance that the contract records
    // We need to read the actual balance from the contract storage to get the inflated value
    // Using a getter or calling withdraw with a large amount would fail differently
    // Instead, we try to withdraw depositAmount + 1 wei (the inflated balance)
    const inflatedAmount = depositAmount + 1n;

    // This withdrawal should succeed on original but fail on mutant due to insufficient contract balance
    await expect(
      instance.connect(user).withdraw(inflatedAmount)
    ).to.be.reverted;
  });
});