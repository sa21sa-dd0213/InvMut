import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m035a9a18 - setOperator", function () {
  it("should kill mutant by verifying operator is set to the provided address, not address(0)", async function () {
    const [owner, operatorAddr] = await ethers.getSigners();
    
    // Deploy with constructor arguments
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    
    // We need to provide valid constructor args: _operator, _clpToken, _booster, _rewardTokens
    // Since we're testing the mutant that affects setOperator, we can use zero addresses for the other args
    // as they won't affect this test
    const clpToken = ethers.ZeroAddress;
    const booster = ethers.ZeroAddress;
    const rewardTokens: string[] = [];
    
    const instance = await CVXStakerFactory.deploy(
      operatorAddr.address,
      clpToken,
      booster,
      rewardTokens
    );
    await instance.waitForDeployment();

    // First, verify the initial operator is set correctly from constructor
    const initialOperator = await instance.operator();
    expect(initialOperator).to.equal(operatorAddr.address);

    // Now call setOperator with a different address
    const newOperator = addr1; // or another signer
    await instance.connect(owner).setOperator(newOperator.address);

    // Get the operator after the mutation
    const updatedOperator = await instance.operator();

    // The mutant would set operator to address(0), so we expect it to be the newOperator address
    // If the mutant is live, this assertion will fail (kill the mutant)
    expect(updatedOperator).to.equal(newOperator.address);
    
    // Additionally, verify it's not the zero address
    expect(updatedOperator).to.not.equal(ethers.ZeroAddress);
  });
});