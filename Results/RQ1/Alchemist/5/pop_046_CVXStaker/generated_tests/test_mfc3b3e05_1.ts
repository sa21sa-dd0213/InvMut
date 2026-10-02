import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - setOperator", function () {
  it("should revert when calling setOperator and operator is set to address(this) instead of the parameter", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock tokens and booster for constructor arguments
    const CLPToken = await ethers.getContractFactory("ERC20Mock");
    const clpToken = await CLPToken.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const Booster = await ethers.getContractFactory("BoosterMock");
    const booster = await Booster.deploy();
    await booster.waitForDeployment();

    const rewardTokens = [addr1.address]; // placeholder reward token address

    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      owner.address, // operator
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Test that setOperator with a specific address sets the operator to that address
    const newOperator = addr2.address;
    await instance.setOperator(newOperator);
    
    // The mutant sets operator = address(this) instead of _operator
    // So the operator should be the contract address, not newOperator
    const contractAddress = await instance.getAddress();
    const currentOperator = await instance.operator();
    
    // This assertion will fail on the mutant because operator will be contract address
    // On the original, operator will be newOperator
    expect(currentOperator).to.equal(newOperator);
    
    // Additional check: verify that the operator is NOT the contract address
    expect(currentOperator).to.not.equal(contractAddress);
  });
});