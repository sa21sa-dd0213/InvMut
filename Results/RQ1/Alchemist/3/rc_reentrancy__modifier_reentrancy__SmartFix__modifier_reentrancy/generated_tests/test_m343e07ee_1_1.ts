import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - m343e07ee", function () {
  it("should revert when called from a Bank contract that returns the correct token hash (kills the != mutant)", async function () {
    // Deploy the Bank contract first (no constructor args)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor args)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Get the bank's address to call from
    const bankAddress = await bank.getAddress();

    // On the original contract, calling airDrop from the Bank contract should succeed
    // because Bank.supportsToken() returns the correct hash matching "Nu Token"
    // On the mutant, the != check will reject this call because hashes are equal
    
    // Connect as the bank contract (using signer that has bank address as msg.sender)
    // We need to impersonate the bank contract to call from its address
    await ethers.provider.send("hardhat_impersonateAccount", [bankAddress]);
    const bankSigner = await ethers.getSigner(bankAddress);
    
    // Fund the bank signer with some ETH for gas
    const [owner] = await ethers.getSigners();
    await owner.sendTransaction({
      to: bankAddress,
      value: ethers.parseEther("1.0")
    });

    // Connect instance as bank signer
    const instanceFromBank = instance.connect(bankSigner);

    // This should revert on the mutant because the hashes ARE equal,
    // but the mutant requires them to be NOT equal
    await expect(
      instanceFromBank.airDrop()
    ).to.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [bankAddress]);
  });
});