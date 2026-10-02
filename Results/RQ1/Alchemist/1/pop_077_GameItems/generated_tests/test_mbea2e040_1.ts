import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GameItems mutant mbea2e040 test", function () {
    it("should detect mutant that removes ERC1155 base URI initialization", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("GameItems");
        const instance = await Factory.deploy(owner.address, addr1.address);
        await instance.waitForDeployment();

        // Create a game item without setting a custom token URI
        await instance.connect(owner).createGameItem(
            "TestItem",    // name_
            "",            // tokenURI (empty, so it should use base URI)
            false,         // finiteSupply
            true,          // transferable
            100,           // itemsRemaining
            ethers.parseEther("1"), // itemPrice
            10             // dailyAllowance
        );

        // Call uri() for tokenId 0 - should return base URI in original, empty in mutant
        const tokenURI = await instance.uri(0);
        
        // The original sets base URI to "https://ipfs.io/ipfs/", so this should not be empty
        expect(tokenURI).to.not.equal("");
    });
});