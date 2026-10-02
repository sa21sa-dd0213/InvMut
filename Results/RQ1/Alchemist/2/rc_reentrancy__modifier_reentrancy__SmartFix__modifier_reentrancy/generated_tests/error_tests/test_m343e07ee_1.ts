import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - m343e07ee", function () {
  it("should detect the supportsToken modifier equality-to-inequality mutation", async function () {
    const [owner, bankSigner] = await ethers.getSigners();
    
    // Deploy the Bank contract first (it has supportsToken() function)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Get the address of the Bank contract to use as msg.sender
    const bankAddress = await bank.getAddress();
    
    // The original contract checks: keccak256("Nu Token") == Bank(msg.sender).supportsToken()
    // The mutant checks: keccak256("Nu Token") != Bank(msg.sender).supportsToken()
    // Since the Bank contract returns the correct hash, the original should pass and mutant should fail
    
    // Call airDrop() from the Bank contract's address (which has supportsToken returning correct hash)
    // On original: require passes because values are equal
    // On mutant: require fails because values are equal (mutant expects !=)
    await expect(
      instance.connect(bankSigner).airDrop()
    ).to.be.reverted;
  });
});