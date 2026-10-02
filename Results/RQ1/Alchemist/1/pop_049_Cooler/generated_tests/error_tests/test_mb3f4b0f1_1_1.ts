import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb3f4b0f1 by detecting incorrect interest calculation when division is replaced with addition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Cooler (note: Cooler is deployed via Clone pattern, but we need to deploy it directly for testing interestFor)
    // Since Cooler inherits from Clone and is abstract, we need to deploy the actual implementation
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    const cooler = await CoolerFactory.deploy();
    await cooler.waitForDeployment();

    // Test interestFor with specific values that will expose the mutant
    // Using amount_ = 1e18, rate_ = 1e18, duration_ = 365 days
    const amount = ethers.parseEther("1");
    const rate = ethers.parseEther("1");
    const duration = 365 * 24 * 60 * 60; // 365 days in seconds

    // Call interestFor - this function is public and doesn't require state
    const result = await cooler.interestFor(amount, rate, duration);

    // Expected result: (1e18 * 1e18) / 1e18 = 1e18
    // Mutant would return: (1e18 * 1e18) + 1e18 = 1e36 + 1e18
    const expectedResult = ethers.parseEther("1");

    // The mutant would produce an astronomically larger value
    // Original returns 1e18, mutant returns ~1e36 + 1e18
    // Assert that result is NOT the mutant's incorrect value
    expect(result).to.equal(expectedResult);

    // Additional assertion to ensure we're not getting the mutant's value
    const mutantResult = ethers.parseEther("1000000000000000001"); // 1e18 + 1e18
    expect(result).to.not.equal(mutantResult);
  });
});