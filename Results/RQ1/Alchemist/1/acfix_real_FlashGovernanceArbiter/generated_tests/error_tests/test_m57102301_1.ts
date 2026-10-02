import { expect } from "chai";
import { ethers } } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceToleranceInt", function () {
    it("should kill mutant m57102301 by passing a negative v1 value", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy with a mock DAO address (any valid address)
        const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
        const instance = await Factory.deploy(addr1.address);
        await instance.waitForDeployment();
        
        // Configure security parameters with changeTolerance set to 50
        // First, we need to make the deployer a successful proposal sender
        // We can set DAO to owner and call setDAO to allow configuration
        await instance.setDAO(owner.address);
        await instance.endConfiguration();
        
        // Configure security with 50% tolerance
        await instance.configureSecurityParameters(10, 100, 50);
        
        // Now test enforceToleranceInt with a negative v1 value
        // Original: -1 * v1 = -1 * (-5) = 5 (correct absolute value)
        // Mutant: -1 + v1 = -1 + (-5) = -6 (wrong, huge uint256)
        // v2 = 1, so original should pass (|v1|=5, |v2|=1, diff=4, 4*100=400, 50*5=250, 400<250? false, should revert)
        // But we just need to detect the difference - the mutant will produce different behavior
        
        // The mutant will convert -6 to a huge uint256, causing unexpected behavior
        // We expect the original to revert with "FE1" when v1=-5, v2=1 and tolerance is 50%
        // The mutant may not revert or revert with different error
        await expect(
            instance.connect(addr1).enforceToleranceInt(-5, 1)
        ).to.be.revertedWith("FE1");
    });
});