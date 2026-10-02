import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test m9a0e2e0a", function () {
  it("should revert when calling airDrop from a contract that returns incorrect supportsToken hash", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract first (no constructor args)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor args)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Get the bank address to use as msg.sender
    const bankAddress = await bank.getAddress();
    
    // Call airDrop from the bank address - the supportsToken modifier checks 
    // keccak256("Nu Token") == Bank(msg.sender).supportsToken()
    // The Bank contract returns the correct hash, so this should pass the supportsToken check
    // but the hasNoBalance modifier requires tokenBalance[msg.sender] == 0
    // The bank address has 0 balance initially, so hasNoBalance passes
    // The removed require was checking (tokenBalance[msg.sender] + 20) >= tokenBalance[msg.sender]
    // which is always true for unsigned integers (no overflow possible with +20 from 0)
    
    // Connect as bank address and call airDrop
    await expect(
      instance.connect(bank).airDrop()
    ).to.not.be.reverted;
    
    // Verify the token balance increased
    expect(await instance.tokenBalance(bankAddress)).to.equal(20);
  });

  it("should revert when calling airDrop with existing balance (hasNoBalance modifier test)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contracts
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // First call should succeed (balance is 0)
    await instance.connect(bank).airDrop();
    
    // Second call should revert due to hasNoBalance modifier
    await expect(
      instance.connect(bank).airDrop()
    ).to.be.reverted;
  });

  it("should revert when called from an EOA (not a contract) due to supportsToken modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Calling from EOA will fail because supportsToken tries to call Bank(msg.sender).supportsToken()
    // which will revert since addr1 is not a contract
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});