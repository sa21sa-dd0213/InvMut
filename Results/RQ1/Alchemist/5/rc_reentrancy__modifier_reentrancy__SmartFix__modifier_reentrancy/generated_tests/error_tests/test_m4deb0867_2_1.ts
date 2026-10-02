import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should detect the mutant by calling airDrop with zero balance expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Bank contract first (required by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy - no constructor arguments needed
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Verify addr1 has zero balance
    expect(await instance.tokenBalance(addr1.address)).to.equal(0);

    // Attempt to call airDrop from addr1
    // The original contract would succeed (0 + 20 >= 0 is true)
    // The mutant would revert (0 + 20 > 0 is false)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;

    // Verify the balance was updated to 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
});