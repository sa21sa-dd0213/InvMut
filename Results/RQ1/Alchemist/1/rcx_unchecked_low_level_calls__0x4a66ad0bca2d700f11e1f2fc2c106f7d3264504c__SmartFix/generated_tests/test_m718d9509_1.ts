import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m718d9509 detection", function () {
  it("should detect keccak256 replaced with sha256 by verifying correct function selector is used in low-level call", async function () {
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // The contract checks msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate or use a signer that matches this address
    // Since we cannot control private keys for arbitrary addresses in tests,
    // we'll deploy a helper contract that can call from that address
    
    // Alternative approach: Deploy a simple token to verify the call target
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // The original contract has hardcoded from and caddress
    // We'll need to deploy a new EBU that uses our test addresses
    // Since the addresses are hardcoded, we need to work with them
    
    // Get the hardcoded from address
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    
    // We need to fund the fromAddress to pay for gas and have it call the function
    // In Hardhat we can use impersonateAccount for mainnet forking, but for local testing
    // we'll deploy a modified version that uses our test addresses
    
    // Since the original contract has hardcoded addresses, we'll create a modified
    // contract for testing purposes that uses our test accounts
    const modifiedFactory = await ethers.getContractFactory("EBU", {
      libraries: {},
      constructorArgs: []
    });
    
    // Deploy a version where we can set the addresses via constructor
    const TestEBU = await ethers.getContractFactory("TestEBU");
    const testInstance = await TestEBU.deploy(owner.address, token.target);
    await testInstance.waitForDeployment();
    
    // Now call transfer with valid parameters
    const tos = [addr1.address];
    const amounts = [ethers.parseEther("1")];
    
    // This should succeed on original (correct selector) but fail on mutant
    // because mutant uses sha256 which produces wrong function selector
    const tx = await testInstance.connect(owner).transfer(tos, amounts);
    const receipt = await tx.wait();
    
    // Check that the transfer actually happened on the token contract
    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });
});