import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m72961402 test", function () {
    it("should detect that caddress is address(0) instead of the original contract address", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy the EBU contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Get the caddress value
        const caddress = await instance.caddress();
        
        // Verify that the mutant sets caddress to address(0)
        expect(caddress).to.equal(ethers.ZeroAddress);
        
        // Now call the transfer function and verify it fails to execute
        // Prepare test addresses and amounts
        const tos = [addr1.address];
        const amounts = [1]; // 1 token (wei)
        
        // The transfer function requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // Use impersonation or directly set the owner as this address
        // Since we can't change msg.sender in Hardhat easily, we'll verify the contract state
        // The mutant's caddress is address(0), so any call to it will succeed but do nothing
        
        // Verify that calling transfer with the correct sender would result in no actual transfer
        // Since caddress is address(0), the call will return true but perform no action
        const from = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        
        // We can verify the caddress is zero, which is the key mutation
        // The test should confirm that the mutant's caddress is address(0) 
        // while the original would have the specific contract address
        expect(caddress).to.equal(ethers.ZeroAddress);
        
        // Additional verification: the transfer function will call address(0)
        // which will succeed but do nothing, making the function ineffective
        // We can verify by checking that no event is emitted (since no actual transfer happens)
        await expect(
            instance.connect(await ethers.getImpersonatedSigner(from)).transfer(tos, amounts)
        ).to.not.emit(instance, "Transfer"); // No transfer event expected since address(0) does nothing
    });
});