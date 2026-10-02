import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection", function () {
    it("should detect that constructor sets owner to address(this) instead of _owner", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Phishable");
        const instance = await Factory.deploy(owner.address);
        await instance.waitForDeployment();

        // The contract's own address should NOT be the owner if the constructor worked correctly
        const contractAddress = await instance.getAddress();
        const storedOwner = await instance.owner();
        
        // In the mutant, owner would be address(this) == contractAddress
        // In the original, owner would be owner.address
        // We expect the owner to be the address we passed, not the contract itself
        expect(storedOwner).to.equal(owner.address);
        expect(storedOwner).to.not.equal(contractAddress);
    });
});