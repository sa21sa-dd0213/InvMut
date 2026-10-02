import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m36a7f9c4 test", function () {
    it("should revert when calling assertionResolvedCallback from unauthorized address", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy a mock OptimisticAsserter to pass as constructor argument
        const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
        const mockAsserter = await MockOptimisticAsserter.deploy();
        await mockAsserter.waitForDeployment();
        
        const Factory = await ethers.getContractFactory("BaseEscalationManager");
        const instance = await Factory.deploy(await mockAsserter.getAddress());
        await instance.waitForDeployment();
        
        // Call assertionResolvedCallback from addr1 (not the optimistic asserter)
        // Original contract should revert, mutant should not
        await expect(
            instance.connect(addr1).assertionResolvedCallback(
                ethers.keccak256(ethers.toUtf8Bytes("test")),
                true
            )
        ).to.be.revertedWith("Not the optimistic asserter");
    });
});

// Helper contract to satisfy constructor requirement
contract MockOptimisticAsserter {
    // Empty contract just for deployment
}