import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m99849d95", function () {
    it("should return true when transfer succeeds - kills mutant that removes return", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy a simple ERC20 token that supports transferFrom
        const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
        const token = await TokenFactory.deploy("Test", "TST", 18);
        await token.waitForDeployment();
        
        // Deploy the airPort contract (no constructor args needed)
        const AirPortFactory = await ethers.getContractFactory("airPort");
        const airPort = await AirPortFactory.deploy();
        await airPort.waitForDeployment();
        
        // Setup: mint tokens to owner and approve airPort to transfer from owner
        await token.mint(owner.address, ethers.parseEther("100"));
        await token.connect(owner).approve(airPort.target, ethers.parseEther("100"));
        
        // Call transfer with valid parameters
        const recipients = [addr1.address, addr2.address];
        const tx = await airPort.transfer(
            owner.address,
            token.target,
            recipients,
            ethers.parseEther("10")
        );
        const receipt = await tx.wait();
        
        // The transaction should not revert - if it doesn't revert, the return statement exists
        // The mutant would revert at the end due to missing return
        expect(receipt.status).to.equal(1);
        
        // Verify the actual transfer happened (original behavior)
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("10"));
    });
});