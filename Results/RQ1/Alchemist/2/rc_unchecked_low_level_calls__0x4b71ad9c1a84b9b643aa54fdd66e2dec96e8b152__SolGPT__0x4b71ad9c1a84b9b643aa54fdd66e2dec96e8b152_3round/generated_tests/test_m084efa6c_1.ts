import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant detection test", function () {
    it("should revert when external call fails (original), but mutant would succeed", async function () {
        const [owner, from, recipient] = await ethers.getSigners();
        
        // Deploy the airPort contract
        const AirportFactory = await ethers.getContractFactory("airPort");
        const airport = await AirportFactory.deploy();
        await airport.waitForDeployment();
        
        // Deploy a simple contract that always fails on transferFrom
        const FailTransferFactory = await ethers.getContractFactory("FailTransfer");
        const failContract = await FailTransferFactory.deploy();
        await failContract.waitForDeployment();
        
        // Call transfer with the failing contract address
        const tos = [recipient.address];
        const value = ethers.parseEther("1");
        
        // This should revert because the external call will fail
        await expect(
            airport.transfer(from.address, await failContract.getAddress(), tos, value)
        ).to.be.reverted;
    });
});

// Helper contract that always fails on transferFrom
contract FailTransfer {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}