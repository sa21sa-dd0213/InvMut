import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant med14c137 test", function () {
    it("should revert on successful external call when mutant changes !_s to true", async function () {
        const [owner, from, to] = await ethers.getSigners();
        
        // Deploy demo contract (no constructor arguments)
        const DemoFactory = await ethers.getContractFactory("demo");
        const demo = await DemoFactory.deploy();
        await demo.waitForDeployment();
        
        // Deploy a simple ERC20-like contract that will accept transferFrom calls
        const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
        const token = await TokenFactory.deploy();
        await token.waitForDeployment();
        
        // Setup: mint tokens to 'from' and approve demo contract to spend them
        const mintAmount = ethers.parseEther("100");
        await token.mint(from.address, mintAmount);
        await token.connect(from).approve(await demo.getAddress(), mintAmount);
        
        const recipients = [to.address];
        const transferAmount = ethers.parseEther("10");
        
        // This call should succeed on original (transferFrom works) but fail on mutant
        // because mutant replaces !_s with true, causing unconditional revert
        await expect(
            demo.connect(owner).transfer(
                from.address,
                await token.getAddress(),
                recipients,
                transferAmount
            )
        ).to.be.reverted;
    });
});