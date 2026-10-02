import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant test for mc46e19d5", function () {
  it("should kill mutant by withdrawing less than balance (balance > amount) after meeting MinSum", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy PRIVATE_ETH_CELL (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(100); // Set MinSum to 100 wei
    await instance.connect(owner).Initialized();

    // User deposits 200 wei
    await instance.connect(user).Deposit({ value: ethers.parseEther("0.0000000000000002") }); // 200 wei

    // Attempt to withdraw 150 wei (balance 200 > amount 150, should pass on original, fail on mutant)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.00000000000000015")) // 150 wei
    ).to.be.reverted; // Mutant reverts because balance(200) != amount(150), while original would succeed
  });
});