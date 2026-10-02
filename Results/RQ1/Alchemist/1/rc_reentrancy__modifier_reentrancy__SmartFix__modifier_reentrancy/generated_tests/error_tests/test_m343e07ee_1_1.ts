import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - supportsToken != replacement", function () {
  it("should kill mutant by calling airDrop with valid Bank and expecting revert when == is changed to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();
    
    // Get the Bank contract address to use as caller
    const bankAddress = await bank.getAddress();
    
    // Connect as the Bank contract (msg.sender will be bank address)
    const bankSigner = await ethers.getImpersonatedSigner(bankAddress);
    
    // Fund the bank signer with ether to pay for gas (if needed)
    await owner.sendTransaction({
      to: bankAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Call airDrop from the bank address (which supports "Nu Token")
    // In the original contract, this should succeed
    // In the mutant (with !=), this should revert because the hashes match
    await expect(
      modEntrancy.connect(bankSigner).airDrop()
    ).to.be.reverted;
  });
});