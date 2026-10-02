import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - tokenFromReflection", function () {
  it("should detect mutant that changes <= to >= in tokenFromReflection", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with constructor arguments (router address and USD token address)
    // For testing we can use any addresses since we're just testing the view function
    const routerAddress = "0x0000000000000000000000000000000000000001";
    const usdTokenAddress = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(routerAddress, usdTokenAddress);
    await instance.waitForDeployment();

    // Call tokenFromReflection with a small reflection amount (less than _rTotal)
    // The original contract should allow this since 1 <= _rTotal
    // The mutant will revert because 1 >= _rTotal is false
    const reflectionAmount = ethers.parseEther("1");
    await expect(instance.tokenFromReflection(reflectionAmount)).to.not.be.reverted;

    // Also test with zero which should work on original but not on mutant
    await expect(instance.tokenFromReflection(0)).to.not.be.reverted;
  });
});