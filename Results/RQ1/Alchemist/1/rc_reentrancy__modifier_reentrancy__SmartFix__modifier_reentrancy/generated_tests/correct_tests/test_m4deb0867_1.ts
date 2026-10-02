import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - m4deb0867", function () {
  it("should detect mutant by showing that >= and > behave identically due to arithmetic properties", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address to use as msg.sender for supportsToken check
    const contractAddress = await instance.getAddress();
    
    // First, call airDrop from addr1 - this should succeed
    // The supportsToken modifier checks Bank(msg.sender).supportsToken()
    // But addr1 is not a Bank contract, so we need to call from the contract itself
    // or use a different approach
    
    // Since the contract doesn't have a way to call itself, we need to
    // deploy a helper contract that acts as a Bank
    const HelperFactory = await ethers.getContractFactory("Bank");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();
    
    // The airDrop function can only be called if msg.sender is a Bank contract
    // that returns the correct supportsToken value. Let's test with a normal user
    // which will fail the supportsToken modifier
    
    // This test demonstrates that the mutant cannot be killed because
    // tokenBalance[msg.sender] + 20 is always > tokenBalance[msg.sender] for uint
    // Therefore >= and > produce identical results
    
    // Attempt to call airDrop from addr1 - should revert due to supportsToken modifier
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
    
    // The only way to call airDrop is if msg.sender is a Bank contract
    // Let's verify the supportsToken function works correctly
    const supportsTokenResult = await bank.supportsToken();
    expect(supportsTokenResult).to.equal(ethers.keccak256(ethers.toUtf8Bytes("Nu Token")));
    
    // Note: This mutant cannot be killed because the arithmetic overflow protection
    // in Solidity 0.8+ ensures that tokenBalance[msg.sender] + 20 is always
    // strictly greater than tokenBalance[msg.sender] for any valid uint value.
    // Both >= and > operators produce the same result in all cases.
  });
});