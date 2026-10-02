import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m9dc4c80e - setCaller test", function () {
    it("should kill mutant by calling setCaller with a specific address and then verifying onlyCaller functions use that address", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy DCF with constructor argument (liquidityReceiveAddress)
        const liquidityReceiveAddress = addr2.address;
        const Factory = await ethers.getContractFactory("DCF");
        const instance = await Factory.deploy(liquidityReceiveAddress);
        await instance.waitForDeployment();

        // Call setCaller with a specific address different from the Uniswap router
        await instance.connect(owner).setCaller(addr1.address);

        // Now try to call a function restricted by onlyCaller modifier from addr1
        // If the mutant is present, cfo will be ROUTER instead of addr1, so this should revert
        // If original, it should succeed
        await expect(
            instance.connect(addr1).distributeToken()
        ).to.be.revertedWith("Insufficient token balance");
        // Note: The revert reason "Insufficient token balance" indicates the function
        // was actually called (meaning addr1 is the cfo), which would pass on original
        // but fail on mutant because addr1 is not cfo (mutant sets cfo to ROUTER)
        
        // Alternative: Check that calling from addr1 fails with "onlyCaller" on mutant
        // but the above should work because on original, addr1 IS the cfo
    });
});