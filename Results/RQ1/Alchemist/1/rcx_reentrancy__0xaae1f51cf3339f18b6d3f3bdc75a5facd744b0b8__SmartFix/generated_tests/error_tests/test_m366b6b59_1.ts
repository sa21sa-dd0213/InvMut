import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m366b6b59 test", function () {
  it("should kill mutant by depositing non-zero value and checking balance increases", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract to allow deposits
    await instance.Initialized();

    // Deposit a non-zero amount from addr1
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();

    // Check that balance increased (original behavior)
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);

    // The mutant would revert on the require statement, so this test fails on mutant
    // (if mutant were deployed, tx would revert and balance would not be set)
  });
});