import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m72961402 test", function () {
    it("should detect that caddress is zero address in mutant", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy the EBU contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Check that caddress is not zero address in original
        // In the mutant it will be address(0)
        const caddress = await instance.caddress();
        
        // The mutant changes caddress to address(0)
        // We can verify this directly
        expect(caddress).to.equal(ethers.ZeroAddress);
        
        // Now test the transfer function behavior
        // First, fund the from address with some tokens (simulate)
        const fromAddress = await instance.from();
        
        // Call transfer with valid parameters
        const recipients = [addr1.address, addr2.address];
        const amounts = [10, 20]; // in whole tokens (will be multiplied by 1e18)
        
        // Execute transfer as the authorized sender (owner is 0x9797...)
        // The contract checks msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // We need to impersonate or use that specific address
        // Since we can't easily get that signer, we'll check the revert behavior
        
        // The transfer function should succeed (return true) even with zero address
        // because low-level calls to zero address succeed
        const tx = await instance.connect(owner).transfer(recipients, amounts);
        await tx.wait();
        
        // The test should detect the mutant because:
        // In original: caddress is a real contract, call may revert or transfer tokens
        // In mutant: caddress is zero address, call always succeeds but does nothing
        // We can verify by checking that the call returned success (tx succeeded)
        // and that caddress is indeed zero
        expect(await instance.caddress()).to.equal(ethers.ZeroAddress);
    });
});