import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - supportsToken modifier", function () {
  it("should kill the mutant by calling airDrop from a correctly implemented Bank contract that returns the exact hash", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Bank contract first (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Connect the bank contract as msg.sender to call airDrop
    const bankAsSigner = await ethers.getImpersonatedSigner(await bank.getAddress());

    // Fund the impersonated signer with ETH to pay for gas
    await owner.sendTransaction({
      to: await bankAsSigner.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Connect the instance with the bank as caller
    const instanceFromBank = instance.connect(bankAsSigner);

    // This should succeed on the original (== check passes) but revert on the mutant (!= check fails)
    await expect(instanceFromBank.airDrop()).to.be.reverted;
  });
});