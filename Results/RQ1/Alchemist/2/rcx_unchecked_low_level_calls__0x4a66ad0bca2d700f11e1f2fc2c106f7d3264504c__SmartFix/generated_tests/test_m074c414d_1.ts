import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m074c414d (loop condition inversion)", function () {
  it("should kill mutant by verifying that transfer with valid recipients executes external calls", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the from address and caddress from the contract
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();

    // Create a valid transfer call with 2 recipients
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // non-zero values that pass the require check

    // Get initial balance of caddress to detect external calls
    const provider = ethers.provider;
    const initialBalance = await provider.getBalance(caddress);

    // Execute transfer - should succeed and make external calls in original
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();

    // Check that the caddress received Ether (from the external calls)
    const finalBalance = await provider.getBalance(caddress);
    
    // In the original, the loop executes and makes external calls,
    // transferring msg.value (0) but still executing call which costs gas
    // The mutant with i>_tos.length will never execute the loop body,
    // so no external calls are made - we detect this by checking
    // that the caddress balance changed (indicating loop execution)
    expect(finalBalance).to.not.equal(initialBalance, 
      "Mutant detected: loop never executed, no external calls made to caddress");
  });
});