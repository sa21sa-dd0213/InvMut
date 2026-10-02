import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m6648f569 - sha256 vs keccak256", function () {
  it("should revert when calling transfer with a valid caddress that implements transferFrom, due to wrong function selector", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple helper contract that implements transferFrom
    const HelperFactory = await ethers.getContractFactory("Helper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();

    // Deploy the main demo contract (no constructor arguments needed)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();

    const recipients = [to.address];
    const amounts = [ethers.parseEther("1")];

    // This should revert because sha256 produces a different selector than keccak256
    await expect(
      demo.transfer(from.address, await helper.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});

// Helper contract that implements transferFrom to make the call succeed with correct selector
contract Helper {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return true;
    }
}