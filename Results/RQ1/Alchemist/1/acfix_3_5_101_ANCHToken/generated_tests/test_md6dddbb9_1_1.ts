import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant md6dddbb9 - setRewardRate access control", function () {
  it("should revert when non-owner calls setRewardRate on original, but should succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with constructor arguments (router and USD token addresses - use dummy addresses for testing)
    const Factory = await ethers.getContractFactory("ANCHToken");
    const routerAddress = "0x0000000000000000000000000000000000000001"; // dummy
    const usdTokenAddress = "0x0000000000000000000000000000000000000002"; // dummy
    const instance = await Factory.deploy(routerAddress, usdTokenAddress);
    await instance.waitForDeployment();

    // Try to call setRewardRate from non-owner address
    // On original (with onlyOwner modifier) this should revert
    // On mutant (without onlyOwner modifier) this should succeed
    const tx = instance.connect(addr1).setRewardRate(10);

    // If the contract is the original, this will revert and the test passes
    // If the contract is the mutant, this will succeed and the test fails (killing the mutant)
    await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
  });
});