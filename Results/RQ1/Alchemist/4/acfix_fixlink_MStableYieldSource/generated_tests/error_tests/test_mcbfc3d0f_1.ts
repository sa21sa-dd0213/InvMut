import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - approveMax access control", function () {
  it("should revert when non-owner calls approveMax (kills mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a valid underlying token
    const MockERC20 = await ethers.getContractFactory("ERC20Mock");
    const mockToken = await MockERC20.deploy("Mock", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    const MockSavings = await ethers.getContractFactory("SavingsContractMock");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax from a non-owner address
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});