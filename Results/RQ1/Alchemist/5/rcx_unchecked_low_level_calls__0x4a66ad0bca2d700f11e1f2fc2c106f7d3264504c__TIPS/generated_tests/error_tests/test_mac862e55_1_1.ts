import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mac862e55", function () {
    it("should revert when from address is zero instead of the hardcoded address", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy the EBU contract (no constructor arguments)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Get the deployed contract address
        const contractAddress = await instance.getAddress();
        
        // Check the from address in the mutant - should be address(0)
        const fromAddress = await instance.from();
        expect(fromAddress).to.equal(ethers.ZeroAddress);
        
        // The caddress is hardcoded - we need to deploy a mock token contract at that address
        // Since we cannot change the hardcoded caddress, we'll use a simple approach:
        // Fund the owner with ETH to simulate the transferFrom call
        // The test should fail because from is address(0) and transferFrom will revert
        
        // Prepare test data
        const recipients = [addr1.address];
        const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
        
        // The transfer function requires msg.sender to be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // Since we're using hardhat accounts, we need to impersonate that address
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]
        });
        
        const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
        
        // Fund the impersonated account with ETH for gas
        await owner.sendTransaction({
            to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
            value: ethers.parseEther("1.0")
        });
        
        // The transfer function calls caddress (0x1f844685f7Bf86eFcc0e74D8642c54A257111923) with transferFrom selector
        // Since from is address(0) in the mutant, this call will revert because you can't transferFrom address(0)
        await expect(
            instance.connect(impersonatedSigner).transfer(recipients, amounts)
        ).to.be.reverted;
        
        // Clean up impersonation
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]
        });
    });
});