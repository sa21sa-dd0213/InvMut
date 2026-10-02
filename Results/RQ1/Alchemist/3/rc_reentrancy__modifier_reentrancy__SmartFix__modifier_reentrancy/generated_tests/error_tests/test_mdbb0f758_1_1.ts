import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should kill mutant mdbb0f758 by verifying successful airDrop call", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract first
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Deploy a caller contract that implements supportsToken
    const CallerFactory = await ethers.getContractFactory("Bank");
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();

    // Call airDrop from the caller contract address
    // Since caller is a Bank contract, supportsToken modifier will pass
    // The caller has zero balance, so hasNoBalance modifier passes
    await instance.connect(caller).airDrop();

    // Verify the balance increased
    expect(await instance.tokenBalance(await caller.getAddress())).to.equal(20);
  });
});