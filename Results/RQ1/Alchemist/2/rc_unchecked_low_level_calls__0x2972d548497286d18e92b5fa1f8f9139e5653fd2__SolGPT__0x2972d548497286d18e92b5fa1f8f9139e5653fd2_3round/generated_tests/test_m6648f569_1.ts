import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant m6648f569 test", function () {
    it("should revert when sha256 is used instead of keccak256 for function selector", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy a simple ERC20-like token that implements transferFrom
        const TokenFactory = await ethers.getContractFactory("ERC20Token");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();
        
        // Deploy the demo contract
        const DemoFactory = await ethers.getContractFactory("demo");
        const demo = await DemoFactory.deploy();
        await demo.waitForDeployment();
        
        // Fund addr1 with some tokens and approve demo to spend them
        await token.transfer(addr1.address, ethers.parseEther("100"));
        await token.connect(addr1).approve(await demo.getAddress(), ethers.parseEther("10"));
        
        // Prepare transfer parameters
        const recipients = [addr2.address];
        const amounts = [ethers.parseEther("5")];
        
        // This call should succeed with original keccak256 but fail with sha256 mutant
        await expect(
            demo.transfer(addr1.address, await token.getAddress(), recipients, amounts)
        ).to.be.reverted;
    });
});