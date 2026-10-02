import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m87022a24 detection test", function () {
    it("should detect mutant by checking that from address is not address(this)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Get the contract's own address
        const contractAddress = await instance.getAddress();
        
        // Get the public 'from' variable
        const fromAddress = await instance.from();
        
        // In the original contract, from should be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // In the mutant, from is set to address(this), which is the contract address
        // The test should fail (revert) if from equals contractAddress (mutant case)
        // or pass if from is the hardcoded address (original case)
        expect(fromAddress).to.not.equal(contractAddress);
        
        // Also verify it matches the expected hardcoded address from original
        const expectedFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        expect(fromAddress).to.equal(expectedFrom);
        
        // Now test the transfer function to ensure it works with the correct from address
        const tos = [addr1.address];
        const values = [1];
        
        // The transfer function requires msg.sender to be the hardcoded address
        // Since we're testing from owner, this will revert - which is expected
        // because only the hardcoded address can call it
        await expect(
            instance.connect(owner).transfer(tos, values)
        ).to.be.reverted;
        
        // If we impersonate the hardcoded address, it should work in original
        // but may behave differently in mutant due to wrong from address
        await ethers.provider.send("hardhat_impersonateAccount", [expectedFrom]);
        const impersonatedSigner = await ethers.getSigner(expectedFrom);
        
        // Fund the impersonated account
        await owner.sendTransaction({
            to: expectedFrom,
            value: ethers.parseEther("1.0")
        });
        
        // In the mutant, this call would use contract address as 'from' in transferFrom
        // which would likely fail if caddress doesn't expect that
        const tx = await impersonatedSigner.sendTransaction({
            to: await instance.getAddress(),
            data: instance.interface.encodeFunctionData("transfer", [tos, values])
        });
        await tx.wait();
        
        // Verify the from address hasn't changed after the call
        const fromAfterCall = await instance.from();
        expect(fromAfterCall).to.equal(expectedFrom);
        expect(fromAfterCall).to.not.equal(contractAddress);
    });
});